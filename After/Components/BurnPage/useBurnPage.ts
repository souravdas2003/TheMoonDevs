import { useState, useEffect } from "react";
import { Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { useWallet } from "./useWallet";
import { useAppSupplies } from "./useAppSupplies";
import { useEthersSigner } from "./useEthersSigner";
import { useChainSelector } from "./useChainSelector";
import { ChainScanner } from "./ChainScanner";
import { CoinGeckoApi } from "./CoinGeckoApi";

enum BurnTxProgress {
  default = "Burn App Tokens",
  burning = "Burning...",
}

export const useBurnPage = () => {
  const {
    walletAddress,
    isWalletConnected,
    openConnectModal,
    walletChain,
  } = useWallet();
  const { supplies, suppliesChain, fetchSupplies } = useAppSupplies(true);
  const { openChainSelector, setOpenChainSelector } = useChainSelector();
  const { showToast } = useAppToast();
  const ethersSigner = useEthersSigner({
    chainId: walletChain?.id ?? chainEnum.mainnet,
  });

  const [burnTransactions, setBurnTransactions] = useState<any[]>([]);
  const [burnAmount, setBurnAmount] = useState("");
  const [txButton, setTxButton] = useState<BurnTxProgress>(
    BurnTxProgress.default
  );
  const [txProgress, setTxProgress] = useState<boolean>(false);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);

  const refetchTransactions = () => {
    Promise.all(
      ChainScanner.fetchAllTxPromises(isChainTestnet(walletChain?.id))
    )
      .then((results: any) => {
        let res = results.flat();
        res = ChainScanner.sortOnlyBurnTransactions(res);
        res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
        setBurnTransactions(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const executeBurn = async () => {
    if (!isWalletConnected) {
      openConnectModal();
    }
    if (burnAmount === "") {
      console.log("Enter amount to migrate");
      showToast("Enter amount to migrate", ToastSeverity.warning);
      return;
    }
    const newTokenAddress = fetchAddressForChain(walletChain?.id, "newToken");
    const oftTokenContract = new Contract(
      newTokenAddress,
      oftAbi,
      ethersSigner
    );
    let amount = parseEther(burnAmount);
    setTxButton(BurnTxProgress.burning);
    setTxProgress(true);
    try {
      const burnTx = await oftTokenContract.burn(amount);
      setBurnTxHash(burnTx.hash);
      console.log(burnTx, burnTx.hash);
      await burnTx.wait();
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      refetchTransactions();
      fetchSupplies();
    } catch (err) {
      console.log(err);
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      showToast("Burn Failed!", ToastSeverity.error);
      return;
    }
  };

  return {
    walletAddress,
    isWalletConnected,
    openConnectModal,
    walletChain,
    supplies,
    suppliesChain,
    fetchSupplies,
    burnTransactions,
    burnAmount,
    setBurnAmount,
    txButton,
    txProgress,
    burnTxHash,
    executeBurn,
    refetchTransactions,
  };
};
